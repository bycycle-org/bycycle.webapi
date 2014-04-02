define(['jquery', 'bycycle'], function ($, bycycle) {

  /**
   * Result Base Class
   *
   * @param data {Object} Raw result data
   */
  var Result = function (data) {
    $.extend(this, data);
    this.overlays = [];
  };

  Result.prototype = {
    addOverlay: function () {
      var overlays = $.makeArray(arguments);
      for (var i = 0, len = overlays.length; i < len; ++i) {
        this.overlays.push(overlays[i]);
      }
    }
  };


  var LookupResult = bycycle.inheritFrom(Result, {
    constructor: function (data) {
      this.superType.call(this, data);
      var id = this.id,
          llString = this.lat_long.coordinates.join(','),
          address = this.address,
          oneLineAddress = address.replace(/\n+/, ', ');
      this.coordinates = this.point.coordinates;
      this.llString = llString;
      this.htmlAddress = address.replace(/\n+/, '<br>');
      this.oneLineAddress = oneLineAddress;
      this.popup = $('<div>');
      this.popupContent = (
        $('<div>')
          .append(
            $('<div>').html(this.htmlAddress))
          .append(
            $('<div>')
              .append($('<a>').attr('href', '#').text('Get directions from').click(
                function (event) {
                  event.preventDefault();
                  byCycle.UI.getDirectionsFrom(oneLineAddress, id, llString);
                }
              ))
          )
          .append(
            $('<div>')
              .append($('<a>').attr('href', '#').text('Get directions to').click(
                function (event) {
                  event.preventDefault();
                  byCycle.UI.getDirectionsTo(oneLineAddress, id, llString);
                }
              ))
          )
          .append(
            $('<div>')
              .append(
                $('<a>').attr('href', '#').text('Remove').click(function (event) {
                  event.preventDefault();
                  byCycle.UI.removeResult(id);
                })
              )
          )
        );
    }
  });


  var Route = bycycle.inheritFrom(Result, {
    constructor: function (data) {
      this.superType.call(this, data);
      var linestring = this.linestring,
          coordinates = linestring.coordinates;
      this.id = ['route', '-', this.start.id, '-', this.end.id].join(''),
      this.start = new LookupResult(this.start);
      this.start.popupContent = this.start.htmlAddress;
      this.end = new LookupResult(this.end);
      this.end.popupContent = this.end.htmlAddress;
      this.coordinates = coordinates;
      this.encodedPolyline = this.linestring_encoded;
    }
  });


  return {
    LookupResult: LookupResult,
    Route: Route
  }
});
