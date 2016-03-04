require 'java'

require_relative '../executor.rb'

class DetectTablesJob < Tabula::Background::Job
  include Observable
  def perform
    filepath = options[:filepath]
    output_dir = options[:output_dir]

    result = {:page_areas_by_page => [], :finished => false}

    # make sure there's something to read here, even if it's just empty
    File.open(output_dir + "/tables.json", 'w') do |f|
      f.puts result.to_json
    end

    begin
      extractor = Tabula::Extraction::ObjectExtractor.new(filepath, :all)
      page_count = extractor.page_count
      nda = Java::TechnologyTabulaDetectors::NurminenDetectionAlgorithm.new
      extractor.extract.each do |page|
        page_index = page.getPageNumber

        at( (page_count + page_index) / 2, page_count, "auto-detecting tables...") #starting at 50%...
        changed

        areas = nda.detect(page)
        result[:page_areas_by_page] << areas.map { |rect|
          [ rect.getLeft,
            rect.getTop,
            rect.getWidth,
            rect.getHeight ]
        }
      end

    rescue Java::JavaLang::Exception => e
      warn("Table auto-detect failed. You may need to select tables manually.")
    end

    result[:finished] = true

    File.open(output_dir + "/tables.json", 'w') do |f|
      f.puts result.to_json
    end

    at(100, 100, "complete")
    return nil
  end
end
