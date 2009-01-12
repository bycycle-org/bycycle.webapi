/* Namespace for User Interface objects and functions. */
byCycle.UI = function () {
  // private:
  var self = null;

  var map_state = byCycle.getParamVal('map_state', function(map_state) {
    // Anything but '', '0' or 'off' is on
    return (!['0', 'off', ''].include(map_state));
  });

  var map_type_name = byCycle.getParamVal('map_type').toLowerCase();
  var map_type = (byCycle.Map[map_type_name] ||            // URL override
                  byCycle.Map[byCycle.config.map_type] ||  // config setting
                  byCycle.Map.base);                       // default
  byCycle.logDebug('Map type:', map_type.description);

  // public:
  return {
    region_id: null,
    map: null,
    map_state: map_state,
    map_type: map_type,

    /* Initialization ********************************************************/

    setLoadingStatus: function(msg) {
      Element.update('loading-status', msg);
    },

    /**
     * Do stuff that must happen _during_ page load
     */
    beforeLoad: function() {
	  Element.show('spinner');
      byCycle.UI.setLoadingStatus('Loading...');
	  byCycle.UI.setLoadingStatus('Initializing map...');
      if (map_state) {
        map_type.beforeLoad();
      }
      Event.observe(window, 'load', byCycle.UI.onLoad);
    },

    /**
     * Do stuff that must happen once page has loaded
     */
    onLoad: function() {
      self = byCycle.UI;
      self._assignUIElements();
      self._createWidgets();
      // If map is "on" and specified map type is loadable, use that map type.
      // Otherwise, use the default map type (base).
      if (!(self.map_state && self.map_type.isLoadable())) {
        self.map_type = byCycle.Map.base;
      }
      self.map = new self.map_type.Map(self, self.map_pane);
      self.onResize();
      self.setRegion(self.region_id);
      self._createEventHandlers();
      var zoom = parseInt(byCycle.getParamVal('zoom'), 10);
      if (!isNaN(zoom)) {
        self.map.setZoom(zoom);
      }
      self.spinner.hide();
	  Element.remove('loading-status');
      self.onResize();
    },

    _assignUIElements: function() {
      // Bar
      self.status = $('status');
      self.spinner = $('spinner');
      self.bookmark_link = $('bookmark');

      // Display panes
      self.display_panes = $A($('col-a').getElementsByClassName('display-pane'));

      // Messages
      self.message_pane = $('message_pane');
      self.info_pane = $('info_pane');
      self.error_pane = $('error_pane');
      self.message_panes = [self.info_pane, self.error_pane];
	  // Results
      self.result_pane = $('result_pane');

      // Map and related
      self.region_el = $('regions');
      self.map_pane = $('map_pane');
    },
	
    _createWidgets: function () {
      // Message fixed pane
      var W = byCycle.widget.FixedPane;
      self.message_fixed_pane = new W(self.message_pane, {collapsible: false});
      self.message_fixed_pane.register_listeners('close', self.showResultPane);
    },

    /* Events ****************************************************************/

    _createEventHandlers: function() {
      Event.observe(window, 'resize', self.onResize);
      Event.observe(document.body, 'unload', self.onUnload);
	  if (self.region_el) {
		Event.observe(self.region_el, 'change', self.setRegionFromSelectBox);
	  }
	  Event.observe('spinner', 'click', function (event) {
		Event.stop(event);
		Element.hide(self.spinner);
	  });
    },

    onResize: function(event) {
      var body_offset = Element.getDimensions(document.body).height;

      // Resize column A
      var offset = Position.cumulativeOffset(self.message_pane)[1];
      offset = offset || Position.cumulativeOffset(self.result_pane)[1];
      var height = body_offset - offset;
      var style = {height: height + 'px'};
      self.display_panes.each(function (pane) { pane.setStyle(style); });

      // Resize map
      offset = Position.cumulativeOffset(self.map_pane)[1];
      height = body_offset - offset;
      self.map.setSize({h: height});
    },

    onUnload: function(event) {
      document.body.style.display = 'none';
      self.map.onUnload();
    },

    handleMapClick: function (event) {},

    /* Display Panes *********************************************************/

    showMessagePane: function(sub_pane, content /*=undefined*/) {
      sub_pane = sub_pane || self.info_pane;
      self.display_panes.each(Element.hide);
      self.message_panes.each(Element.hide);
	  if (content) {
            sub_pane.update(content);
          }
	  sub_pane.show();
      self.message_pane.show();
    },

    showResultPane: function() {
      self.message_pane.hide();
      self.result_pane.show();
    },

    /* Regions ***************************************************************/

    setRegionFromSelectBox: function() {
      self.setRegion($F(self.region_el));
    },

    setRegion: function(region_id) {
      self.region_id = region_id;
      var regions = byCycle.regions.regions;
      var region = regions[region_id];
      if (region) {
        // Zoom to a specific region
        self.map.centerAndZoomToBounds(region.bounds, region.center);
        self._showRegionOverlays(region);
      } else {
        // Show all regions
		var all_regions = byCycle.regions;
		self.map.centerAndZoomToBounds(all_regions.bounds, all_regions.center);
        regions.values().each(function (r) {
          self._showRegionOverlays(r);
        });
      }
    },

	// Show map overlays for a region, creating and caching them first if
	// necessary
    _showRegionOverlays: function(region, use_cached) {
      if (!self.region_id && !region.marker) {
        region.marker = self.map.makeRegionMarker(region);
      } else if (use_cached) {
        self.map.addOverlay(region.marker);
      }
      if (!region.line) {
        region.line = self.map.drawPolyLine(region.linestring);
      } else if (use_cached) {
        self.map.addOverlay(region.line);
      }
    }
  };
}();

