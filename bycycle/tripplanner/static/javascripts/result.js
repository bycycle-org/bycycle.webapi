byCycle.result = {};


/**
 * Result Base Class
 *
 * @param result Object representing the result
 */
byCycle.result.Result = function (result) {
  $.extend(this, result);
  this.id = this.sanitizeId(this.makeId(this));
  this.overlays = [];
};

byCycle.result.Result.prototype = {
  sanitizeId: function (id) {
    return id.replace(/[^a-z0-9-]+/ig, '-').toLowerCase();
  },

  addOverlay: function () {
    var overlays = $.makeArray(arguments);
    for (var i = 0, len = overlays.length; i < len; ++i) {
      this.overlays.push(overlays[i]);
    }
  }
};


byCycle.result.Geocode = byCycle.inheritFrom(byCycle.result.Result, {
  constructor: function (result) {
    this.superType.call(this, result);
    var id = this.id,
        address = result.address;
    this.coordinates = result.lat_long.coordinates,
    this.htmlAddress = address.replace(/\n+/, '<br>');
    this.popup = $('<div>');
    this.popupContent = (
      $('<div>')
        .append(
          $('<div>').html(this.htmlAddress))
        .append(
          $('<div>')
            .append($('<a>').attr('href', '#').text('Get Directions').click(
              function (event) {
                event.preventDefault();
                byCycle.UI.getDirectionsTo(address);
              }
            ))
        )
        .append(
          $('<div>')
            .append(
              $('<a>').attr('href', '#').text('Remove').click(function () {
                event.preventDefault();
                byCycle.UI.removeResult(id);
              })
            )
        )
      );
  },

  makeId: function (result) {
    return 'geocode-result-' + result.address;
  }
});


byCycle.result.Route = byCycle.inheritFrom(byCycle.result.Result, {
  constructor: function (result) {
    this.superType.call(this, result);
    var linestring = this.linestring,
        coordinates = linestring.coordinates;
    this.start = new byCycle.result.Geocode(this.start);
    this.start.popupContent = this.start.htmlAddress;
    this.end = new byCycle.result.Geocode(this.end);
    this.end.popupContent = this.end.htmlAddress;
    this.coordinates = coordinates;
    this.encodedPolyline = this.linestring.encoded;
  },

  makeId: function (result) {
    return 'route-result-' + result.start.address + '-' + result.end.address;
  }
});
