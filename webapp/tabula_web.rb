# -*- coding: utf-8 -*-
require 'cuba'
require 'cuba/render'

require 'digest/sha1'
require 'json'
require 'csv'
require 'tempfile'
require 'fileutils'
require 'securerandom'
require 'shield'
require 'basica'

require_relative '../lib/jars/tabula-extractor-0.7.4-SNAPSHOT-jar-with-dependencies.jar'

require_relative '../lib/tabula_java_wrapper.rb'
java_import 'java.io.ByteArrayOutputStream'
java_import 'java.util.zip.ZipEntry'
java_import 'java.util.zip.ZipOutputStream'

require_relative './tabula_settings.rb'

unless File.directory?(TabulaSettings::DOCUMENTS_BASEPATH)
  raise "DOCUMENTS_BASEPATH does not exist or is not a directory."
end

begin
  require_relative './tabula_version.rb'
rescue LoadError
  $TABULA_VERSION = "rev#{`git rev-list --max-count=1 HEAD`.strip}"
end

require_relative '../lib/tabula_job_executor/executor.rb'
require_relative '../lib/tabula_job_executor/jobs/generate_document_data.rb'
require_relative '../lib/tabula_job_executor/jobs/generate_thumbnails.rb'
require_relative '../lib/tabula_job_executor/jobs/detect_tables.rb'


def is_valid_pdf?(path)
  File.open(path, 'r') { |f| f.read(4) } == '%PDF'
end

class User < Struct.new(:email, :crypted_password)
  include Shield::Model

  def self.fetch(email)
    user = new(email)
    user.password = 'Ch@rity123'

    return user
  end
end

STATIC_ROOT = if defined?($servlet_context)
                File.join($servlet_context.getRealPath('/'), 'WEB-INF/webapp/static')
              else
                File.join(File.dirname(__FILE__), 'static')
              end

Cuba.plugin Cuba::Render
Cuba.plugin Basica
Cuba.settings[:render].store(:views, File.expand_path("views", File.dirname(__FILE__)))
Cuba.use Rack::MethodOverride
Cuba.use Rack::Static, root: STATIC_ROOT, urls: ["/css","/js", "/img", "/swf", "/fonts"]
Cuba.use Rack::ContentLength
Cuba.use Rack::Reloader

def process(filename, filelocation, deleteFile, interestingPages)
  file_id = Digest::SHA1.hexdigest(Time.now.to_s + filename) # just SHA1 of time isn't unique with multiple uploads
  file_path = File.join(TabulaSettings::DOCUMENTS_BASEPATH, file_id)
  FileUtils.mkdir(file_path)

  if deleteFile
    begin
      FileUtils.mv(filelocation,
                   File.join(file_path, 'document.pdf'))
    rescue Errno::EACCES # move fails on windows sometimes
      FileUtils.cp_r(filelocation,
                     File.join(file_path, 'document.pdf'))
      FileUtils.rm_rf(filelocation)
    end
  else
    FileUtils.cp_r(filelocation, File.join(file_path, 'document.pdf'))
  end

  filepath = File.join(file_path, 'document.pdf')

  job_batch = SecureRandom.uuid

  thumbnail_sizes =  [800]

  GenerateDocumentDataJob.create(:filepath => filepath,
                                 :original_filename => filename,
                                 :id => file_id,
                                 :output_dir => file_path,
                                 :thumbnail_sizes => thumbnail_sizes,
                                 :batch => job_batch,
                                 :interesting_pages => interestingPages)

  DetectTablesJob.create(:filepath => filepath,
                         :output_dir => file_path,
                         :batch => job_batch)

  GenerateThumbnailJob.create(:file_id => file_id,
                              :filepath => filepath,
                              :output_dir => file_path,
                              :thumbnail_sizes => thumbnail_sizes,
                              :batch => job_batch)
  return [job_batch, file_id]
end

Cuba.define do

  on env["HTTP_AUTHORIZATION"].nil? do
    res.status = 401
    res.headers["WWW-AUTHENTICATE"] = 'Basic realm="TSP Tabula"'
    res.write "Unauthorized"
  end

  basic_auth(env) do |user, pass|
    if User.authenticate(user, pass) == nil
      res.status = 401
      res.headers["WWW-AUTHENTICATE"] = 'Basic realm="TSP Tabula"'
      res.write "Unauthorized"
    end
  end

  if TabulaSettings::ENABLE_DEBUG_METHODS
    require_relative './tabula_debug.rb'
    on 'debug' do
      run TabulaDebug
    end
  end


  on 'queue' do
    require_relative './tabula_job_progress.rb'
    run TabulaJobProgress
  end

  on delete do

    on 'pdf/:file_id/page/:page_number' do |file_id, page_number|
      index_fname = File.join(TabulaSettings::DOCUMENTS_BASEPATH,
                              file_id,
                              'pages.json')
      index = File.open(index_fname) { |f| JSON.load(f) }
      index.find { |p| p['number'] == page_number.to_i }['deleted'] = true
      File.open(index_fname, 'w') { |f| f.write JSON.generate(index) }
      res.write '' # Firefox complains about an empty response without this.
    end

    # delete an uploaded file
    on 'pdf/:file_id' do |file_id|
      workspace_file = File.join(TabulaSettings::DOCUMENTS_BASEPATH, 'workspace.json')
      raise if !File.exists?(workspace_file)

      workspace = File.open(workspace_file) { |f| JSON.load(f) }
      f = workspace.find { |g| g['id'] == file_id }

      FileUtils.rm_rf(File.join(TabulaSettings::DOCUMENTS_BASEPATH, f['id']))
      workspace.delete(f)

      # update safely
      tmp = Tempfile.new('workspace')
      tmp.write(JSON.generate(workspace))
      tmp.flush; tmp.close
      FileUtils.cp(tmp.path, workspace_file)
      tmp.unlink
      res.write '' # Firefox complains about an empty response without this.
    end

  end

  on put do
    on 'pdf/:file_id/page/:page_number' do |file_id, page_number|
      # nothing yet
    end
  end

  on get do
    on 'pdfs' do
      run Rack::File.new(TabulaSettings::DOCUMENTS_BASEPATH)
    end

    on 'documents' do
      res['Content-Type'] = 'application/json'
      documents = []
      Dir.foreach(TabulaSettings::SEDAR_DOCUMENTS_BASEPATH) do |file|
        next if file == "." or file == ".."
        documents << File.read(File.join(TabulaSettings::SEDAR_DOCUMENTS_BASEPATH, file))
      end

      res.write('{"documents":[' + documents.join(',') + ']}')
    end

    on 'version' do
      res.write JSON.dump({api: $TABULA_VERSION})
    end

    on 'pdf/:file_id/metadata.json' do |file_id|
      workspace_file = File.join(TabulaSettings::DOCUMENTS_BASEPATH, 'workspace.json')
      raise if !File.exists?(workspace_file)

      workspace = File.open(workspace_file) { |f| JSON.load(f) }
      f = workspace.find { |g| g['id'] == file_id }
      res['Content-Type'] = 'application/json'
      res.write f.to_json
    end

    [root, "about", "pdf/:file_id", "help"].each do |paths_to_single_page_app|
      on paths_to_single_page_app do
        res.write File.read("webapp/index.html")
      end
    end

  end # /get

  on post do
    on 'search.json' do
      res['Content-Type'] = 'application/json'

      documents = []
      search_terms = req.params['terms'].split()

      Dir.foreach(TabulaSettings::SEDAR_DOCUMENTS_BASEPATH) do |file|
        next if file == "." or file == ".."

        terms_found = true
        search_terms.each do |term|
          if not file.downcase.include? term.downcase
            terms_found = false
            break
          end
        end

        if terms_found
          documents << File.read(File.join(TabulaSettings::SEDAR_DOCUMENTS_BASEPATH, file))
        end
      end

      res.write('{"documents":[' + documents.join(',') + ']}')
    end

    on 'import.json' do
      filename = File.basename(req.params['source'])
      interesting_pages = req.params['interesting_pages'].split(",").map { |s| s.to_i }
      job_batch, file_id = *process(filename, req.params['source'], false, interesting_pages)
      res.write(JSON.dump([{
        :success => true,
        :file_id => file_id,
        :upload_id => job_batch,
        :filename => filename
      }]))
    end

    on 'upload.json' do
      # Make sure this is a PDF, before doing anything

      if req.params['file'] # single upload mode. this should be deleting once if decide to enable multiple upload for realzies
        job_batch, file_id = *process(req.params['file'][:filename], req.params['file'][:tempfile], true, [])
        unless is_valid_pdf?(req.params['file'][:tempfile].path)
          res.status = 400
          res.write(JSON.dump({
            :success => false,
            :filename => req.params['file'][:filename],
            # :file_id => file_id,
            # :upload_id => job_batch,
            :error => "Sorry, the file you uploaded was not detected as a PDF. You must upload a PDF file. Please try again."
            }))
          next # halt this handler
        end

        res.write(JSON.dump([{
            :success => true,
            :file_id => file_id,
            :upload_id => job_batch
        }]))
      elsif req.params['files']
        statuses = req.params['files'].map do |file|
          if is_valid_pdf?(file[:tempfile].path)
            job_batch, file_id = *process(file[:filename], file[:tempfile], true, [])
            {
              :filename => file[:filename],
              :success => true,
              :file_id => file_id,
              :upload_id => job_batch
            }
          else
            {
              :filename => file[:filename],
              :success => false,
              :file_id => file_id,
              :upload_id => job_batch,
              :error => "Sorry, the file you uploaded was not detected as a PDF. You must upload a PDF file. Please try again."
            }
            # next # halt this handler
          end
        end
        # if they all fail, return 400...
        res.status = 400 if(statuses.find{|a| a[:success] }.empty? )
        res.write(JSON.dump(statuses))
      else
        STDOUT.puts req.params.keys.inspect
      end
    end

    on "pdf/:file_id/save_tsv" do |file_id|
      pdf_path = File.join(TabulaSettings::DOCUMENTS_BASEPATH, file_id, 'document.pdf')

      coords = JSON.load(req.params['coords'])
      coords.sort_by! do |coord_set|
        [
         coord_set['page'],
         [coord_set['y1'], coord_set['y2']].min.to_i / 10,
         [coord_set['x1'], coord_set['x2']].min
        ]
      end

      tables = Tabula.extract_tables(pdf_path, coords)

      basename = File.basename(req.params['new_filename'], File.extname(req.params['new_filename']))
      table_type = req.params['table_type']

      log_file = File.open(File.join(TabulaSettings::LOGS_BASEPATH, DateTime.now().strftime('manual_tsvs_%Y-%m-%d.log')), 'a')

      tables.each_with_index do |table, index|
        page = coords[index]['page']
        method = coords[index]['extraction_method']
        filename = File.join(TabulaSettings::TSV_BASEPATH, "#{basename}-#{table_type}-#{page}_#{index}.#{method}.tsv")

        File.write(filename, table.to_tsv)
        log_file.write("#{filename}\n")
      end

      log_file.close()
      res.redirect("/pdf/#{file_id}")
      
    end

    on "pdf/:file_id/data" do |file_id|
      pdf_path = File.join(TabulaSettings::DOCUMENTS_BASEPATH, file_id, 'document.pdf')

      coords = JSON.load(req.params['coords'])
      coords.sort_by! do |coord_set|
        [
         coord_set['page'],
         [coord_set['y1'], coord_set['y2']].min.to_i / 10,
         [coord_set['x1'], coord_set['x2']].min
        ]
      end

      tables = Tabula.extract_tables(pdf_path, coords)

      filename =  if req.params['new_filename'] && req.params['new_filename'].strip.size
                    basename = File.basename(req.params['new_filename'], File.extname(req.params['new_filename']))
                    "tabula-#{basename}"
                  else
                    "tabula-#{file_id}"
                  end

      case req.params['format']
      when 'csv'
        res['Content-Type'] = 'text/csv'
        res['Content-Disposition'] = "attachment; filename=\"#{filename}.csv\""
        tables.each do |table|
          res.write table.to_csv
        end
      when 'tsv'
        res['Content-Type'] = 'text/tab-separated-values'
        res['Content-Disposition'] = "attachment; filename=\"#{filename}.tsv\""
        tables.each do |table|
          res.write table.to_tsv
        end
      when 'zip'
        res['Content-Disposition'] = "attachment; filename=\"#{filename}.zip\""

        # I hate Java, Ruby, JRuby, Zip files, C, umm, computers, Linux, GNU,
        # parrots-as-gifts, improper climate-control settings, tar, gunzip,
        # streams, computers, did I say that already? ugh.
        baos = ByteArrayOutputStream.new;
        zos = ZipOutputStream.new baos

        tables.each_with_index do |table, index|
          # via https://stackoverflow.com/questions/23612864/create-a-zip-file-in-memory
          # /* File is not on the disk, test.txt indicates
          #    only the file name to be put into the zip */
          entry = ZipEntry.new("#{filename}-#{index}.csv")

          # /* use more Entries to add more files
          #    and use closeEntry() to close each file entry */
          zos.putNextEntry(entry)
          zos.write(table.to_csv.to_java_bytes) # lol java BITES... 
          zos.closeEntry()
        end
        zos.finish
        # you know what, I changed my mind about JRuby.
        # this is actually way easier than it would be in MRE/CRuby.
        # ahahaha. I get the last laugh now.

        res.write String.from_java_bytes(baos.to_byte_array)
      when 'script'
        # Write shell script of tabula-extractor commands.  $1 takes
        # the name of a file from the command line and passes it
        # to tabula-extractor so the script can be reused on similar pdfs.
        res['Content-Type'] = 'application/x-sh'
        res['Content-Disposition'] = "attachment; filename=\"#{filename}.sh\""
        coords.each do |c|
          extraction_method_switch = if c['extraction_method'] == "original"
                                        "--no-spreadsheet"
                                     elsif c['extraction_method'] == "spreadsheet"
                                        "--spreadsheet"
                                     else
                                        ""
                                     end
          res.write "tabula #{extraction_method_switch} -a #{c['y1'].round(3)},#{c['x1'].round(3)},#{c['y2'].round(3)},#{c['x2'].round(3)} -p #{c['page']} \"$1\" \n"
        end
      when 'bbox'
        # Write json representation of bounding boxes and pages for
        # use in OCR and other back ends.
        res['Content-Type'] = 'application/json'
        res['Content-Disposition'] = "attachment; filename=\"#{filename}.json\""
        res.write coords.to_json
     else
        res['Content-Type'] = 'application/json'

        # start JSON array
        res.write  "["
        tables.each_with_index do |table, index|
          res.write ", " if index > 0
          res.write table.to_json
        end

        # end JSON array
        res.write "]"
      end
    end
  end
end
