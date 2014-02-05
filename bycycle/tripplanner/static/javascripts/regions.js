byCycle.regions = (function() {
  var getCenterOfBounds = byCycle.map.base.Map.prototype.getCenterOfBounds;

  // sw => minx, miny
  // ne => maxx, maxy
  // Initially set to sw => max_possible, ne => min_possible
  var bounds_all = {sw: {x: 180, y: 90}, ne: {x: -180, y: -90}};

  var regions = {
    portlandor: {
      key: 'portlandor',
      bounds: {
        sw: {x: -123.485755, y: 44.885219},
        ne: {x: -121.649618, y: 45.814153}
      }
    }
  };

  // Initialize other region attributes and calculate minimum bounds
  // containing all regions
  var bounds, nw, ne, se, sw;
  $.each(regions, function (key, region) {
    bounds = region.bounds;
    ne = bounds.ne;
    sw = bounds.sw;
    nw = {x: sw.x, y: ne.y};
    se = {x: ne.x , y: sw.y};
    // Set attrs on region ``r``
    region.center = getCenterOfBounds(bounds);
    region.linestring = [nw, ne, se, sw, nw];
    // Adjust all-regions bounds
    if (sw.x < bounds_all.sw.x) { bounds_all.sw.x = sw.x; }
    if (sw.y < bounds_all.sw.y) { bounds_all.sw.y = sw.y; }
    if (ne.x > bounds_all.ne.x) { bounds_all.ne.x = ne.x; }
    if (ne.y > bounds_all.ne.y) { bounds_all.ne.y = ne.y; }
  });

  return {
    bounds: bounds_all,
    center: getCenterOfBounds(bounds_all),
    regions: regions
  };
})();
