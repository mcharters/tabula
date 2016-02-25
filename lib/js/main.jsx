var Tabula = require('./tabula.js');
var Backbone = require('backbone');
var $ = require('jquery');

$(function(){
  Tabula.getVersion();
  window.tabula_router = new Tabula.TabulaRouter();
  Backbone.history.start({pushState: true});
});
