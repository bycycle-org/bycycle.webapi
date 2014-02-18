require.config({
  baseUrl: '/static/js/vendor',
  paths: {
    bycycle: '../bycycle'
  },
  packages: [{
    name: 'bycycle',
    main: 'bycycle'
  }],
  shim: {
    bootstrap: {
      deps: ['jquery']
    },
    ol: {
      deps: ['jquery'],
      exports: 'ol'
    }
  }
});


require(['bootstrap', 'bycycle', 'bycycle/ui'], function (_, bycycle, ui) {
  bycycle.init(byCycle);
  ui.init(bycycle.uiConfig);
});
