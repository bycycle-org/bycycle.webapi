define(['jquery', 'bycycle/map'], function ($, map) {
  var getCenterOfBounds = map.Map.prototype.getCenterOfBounds,
      boundsAll = [180, 90, -180, -90],
      regions = {
        portlandor: {
          key: 'portlandor',
          bounds: [-123.485755, 44.885219, -121.649618, 45.814153]
        }
      };

  $.each(regions, function (key, region) {
    var bounds = region.bounds,
        left = bounds[0],
        bottom = bounds[1],
        right = bounds[2],
        top = bounds[3];
    region.center = getCenterOfBounds(bounds);
    if (left < boundsAll[0]) {
      boundsAll[0] = left
    }
    if (bottom < boundsAll[1]) {
      boundsAll[1] = bottom
    }
    if (right > boundsAll[2]) {
      boundsAll[2] = right
    }
    if (top > boundsAll[3]) {
      boundsAll[3] = top
    }
  });

  return {
    bounds: boundsAll,
    center: getCenterOfBounds(boundsAll),
    regions: regions
  };
});
