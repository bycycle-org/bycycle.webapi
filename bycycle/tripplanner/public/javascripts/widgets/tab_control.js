/**
 * Tabinator Tab control
 */
byCycle.widget.TabControl = Class.create();
byCycle.widget.TabControl.prototype = {
  /**
   * @param dom_node The DOM container (or its ID) for this Tab control
   */
  initialize: function(dom_node, initial_tab_id) {
    this.dom_node = $(dom_node);
    this.create_tabs();
    if (initial_tab_id) {
      this.select_by_id(initial_tab_id);
    } else {
      this.show(this.get_initial_tab());
    }
  },

  create_tabs: function() {
    // An individual Tab object. Contains tab id, button, link, and content.
    var tab;
    // All the Tabs in this Tab control (usually a DIV)
    var tabs = {};
    var tab_ids_in_order = [];
    // Get the Tab buttons (usually LIs)
    var tab_buttons = this.dom_node.getElementsByClassName('tab-buttons')[0];
    tab_buttons = $A(tab_buttons.getElementsByClassName('tab-button'));
    // For each Tab button...
    tab_buttons.each((function (tab_button) {
      // ...get the link (A) inside the button
      var tab_link = tab_button.getElementsByTagName('a')[0];
      // ...see if the link has a Tab ID (href="#id")
      var tab_id = this.get_tab_id(tab_link);
      // ...and if it does...
      if (tab_id) {
        // ...add a new Tab to this Tab control
        tab = {};
        tab.id = tab_id;
        tab.button = tab_button;
        tab.link = tab_link;
        // When the Tab is clicked, we use this ID to dereference the Tab
        // object in this Tab control's set of Tabs
        tab.link.tab_id = tab_id;
        // DOM element containing this Tab's content
        tab.content = $(tab_id);
        tabs[tab_id] = tab;
        tab_ids_in_order.push(tab_id);
        Event.observe(tab_link, 'click',
                      this.on_click.bindAsEventListener(this));
        if (!this.first_tab) {
          this.first_tab = tab;
        }
      }
    }).bind(this));
    this.tabs = $H(tabs);
    this.tab_ids_in_order = tab_ids_in_order;
  },

  on_click: function(event) {
    // Select tab on click event
    Event.stop(event);
    var tab_link = Event.findElement(event, 'a');
    this.select_by_id(tab_link.tab_id);
  },

  select: function(index) {
    // Select tab programatically by index
    if (index < 0) {
      // Allow indexing from end using negative index
      index = this.tab_ids_in_order.length + index
    }
    this.select_by_id(this.tab_ids_in_order[index]);
  },

  select_by_id: function(tab_id) {
    // Select tab programatically by ID
    this.tabs.values().each(this.hide.bind(this));
    this.show(this.tabs[tab_id]);
  },

  hide: function(tab) {
    tab.button.removeClassName('selected-tab-button');
    tab.content.removeClassName('selected-tab-content');
    tab.content.addClassName('tab-content');
  },

  show: function(tab) {
    tab.button.addClassName('selected-tab-button');
    tab.content.addClassName('selected-tab-content');
    tab.content.removeClassName('tab-content');
  },

  /**
   * Return the tab ID for a link. The tab ID is the hash part of a URL.
   *
   * @param tab_link An <A>nchor DOM element (or any obj with href attribute).
   */
  get_tab_id: function(tab_link) {
    var id = tab_link.href.match(/#(\w.+)/);
    if (id) {
      return id[1];
    } else {
      return null;
    }
  },

  get_initial_tab: function() {
    var initial_tab;
    var initial_tab_id = this.get_tab_id(window.location);
    if (initial_tab_id) {
      initial_tab = this.tabs[initial_tab_id];
    }
    return initial_tab || this.first_tab;
  }
};
