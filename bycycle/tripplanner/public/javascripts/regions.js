NameSpace('regions', app, function() {
  var self;

  var initialize = function (result) {
    self = app.regions;
    var regions = {};

    for (var i = 0, region_data; i < result.result.length; ++i) {
      region_data = result.result[i];
      regions[region_data.slug] =  new self.Region(region_data);
    }

    // HACK: OL doesn't like the dynamically computed bounds for its
    // ``maxExtent`` map opt.
    // TODO: Figure out why.
    regions.portlandor.geometry.bounds = {
      sw: {x: 7435781, y: 447887},
      ne: {x: 7904954, y: 877395}
    };

    // Compute data for `all` pseudo/uber-region
    var bounds_all = {sw: {x: 180, y: 90}, ne: {x: -180, y: -90}};
    var region, bounds, sw, ne;
    for (var slug in regions) {
      region = regions[slug];
      bounds = region.geometry['4326'].bounds;
      sw = bounds.sw;
      ne = bounds.ne;
      if (sw.x < bounds_all.sw.x) { bounds_all.sw.x = sw.x; }
      if (sw.y < bounds_all.sw.y) { bounds_all.sw.y = sw.y; }
      if (ne.x > bounds_all.ne.x) { bounds_all.ne.x = ne.x; }
      if (ne.y > bounds_all.ne.y) { bounds_all.ne.y = ne.y; }
    }
    var getCenterOfBounds = app.Map.base.Map.prototype.getCenterOfBounds;
    var center = getCenterOfBounds(bounds_all);
    var all = {
        slug: 'all',
        map_type: 'google',
        units: 'degrees',
        srid: 4326,
        geometry: {
          bounds: bounds_all,
          center: center,
          '4326': {
            bounds: bounds_all,
            center: center
          }
        }
    };

    self.all = all;
    self.regions = regions;
  };

  return {
    initialize: initialize,
    all: null,
    regions: null
  };
}());


Class(app.regions, 'Region', null, {
  initialize: function (kwargs) {
    for (var name in kwargs) {
      this[name] = kwargs[name];
    }
  }
});
