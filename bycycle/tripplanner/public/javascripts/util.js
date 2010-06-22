byCycle.util = {
  
  /** Script Functions **/
  
  writeScript: function(src, type) {
    type = type || 'text/javascript';
    document.write('<script src="' + src + '" type="' + type + '"></script>');
  },
  
  appendScript: function(src, type) {
    var script = document.createElement('script');
    script.type = type || 'text/javascript';
    script.src = src;
    document.body.appendChild(script);
  },
  
  /** String Functions **/
  
  /**
   * Remove leading and trailing whitespace from a string and
   * reduce internal runs of whitespace down to a single space.
   * @param the_string The string to clean
   * @param keep_newlines If this is set, reduce internal newlines to a single 
   *        newline instead of a space
   * @return The cleaned string
   */
  cleanString: function(the_string, keep_newlines) {
    if (!the_string) { return ''; }
    // Remove leading and trailing whitespace
    the_string = the_string.replace(/^\s+|\s+$/g, '');
    // Reduce internal whitespace
    if (keep_newlines) {
      //the_string = the_string.replace(/[ \f\t\u00A0\u2028\u2029]+/, ' ');
      the_string = the_string.replace(/[^\n^\r\s]+/, ' ');
      the_string = the_string.replace(/\n+/g, '\n');
      the_string = the_string.replace(/\r+/g, '\r');
      the_string = the_string.replace(/(?:\r\n)+/g, '\r\n');
    } else {
      the_string = the_string.replace(/\s+/g, ' ');
    }
    return the_string;
  },
  
  /**
   * Remove leading and trailing whitespace from a string.
   *
   * @param the_string The string to trim
   * @return The trimmed string
   */
  trim: function(the_string) {
    return the_string.replace(/^\s+|\s+$/g, '');
  },
  
  /**
   * Join a list of strings, separated by the given string, excluding any empty
   * strings in the input list. 
   *
   * @param the_list The list to join
   * @param the_string The string to insert between each string in the list 
   *        (default: ' ')
   * @return The joined string
   */
  join: function(the_list, join_string) {
    join_string = join_string || ' ';
    var new_list = [];
    for (var i = 0; i < the_list.length; ++i) {
      word = _trim(the_list[i]);
      if (word) { new_list.push(word); }
    }
    return new_list.join(join_string);
  }
};
