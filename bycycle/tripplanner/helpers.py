from markupsafe import Markup as literal


def include(app):
    app.add_helper(literal, name='literal', static=True)
    app.add_helper(if_ie, static=True)
    app.add_helper(hide_element, static=True)
    app.add_helper(make_inline_style, static=True)
    app.add_helper(make_tab_buttons, static=True)
    app.add_helper(javascript_include_tag)
    app.add_helper(stylesheet_link_tag)


def if_ie(content, join_string=''):
    """Create and Internet Explorer conditional comment section."""
    return literal(join_string.join(('<!--[if IE]>', content, '<![endif]-->')))


def hide_element(cond=True, as_attr=True):
    rule = 'display: %s' % ('none' if cond else 'block')
    if as_attr:
        rule = 'style="%s"' % rule
    return literal(rule)


def make_inline_style(style_dict):
    """Make an inline style attribute (style="a: b;")."""
    if style_dict:
        styles = ['%s: %s' % (i[0], i[1]) for i in style_dict.items()]
    else:
        styles = ''
    return literal('style="%s"' % '; '.join(styles))


def make_tab_buttons(tab_ids, tag_name='li', selected=''):
    """Make the tab buttons for a tab control (typically, a set of LIs).

    ``tab_ids``
        A list of one or more strings suitable for a URL hash (like
        "tab-id-thirteen"). Each generated button element has class
        "tab-button". Each button has an A element that has href='#tab-id'.
        The A element's link text and title attribute are "Tab Id".

    ``tag_name``
        Specify the tag name for the button elements (defaults to "li")

    ``selected``
        Specify the tab ID of the button that will be initially selected
        (defaults to the first button); the selected button will have class
        "tab-button selected-tab-button"

    """
    buttons = []
    template = '<{tag} class="noprint tab-button {css_class}">{link}</{tag}>'
    link_template = '<a href={href} title="{text}">{text}</a>'
    for tab_id in tab_ids:
        link_text = tab_id.replace('-', ' ').capitalize()
        if tab_id == selected:
            css_class = 'selected-tab-button'
        else:
            css_class = ''
        href = '#{}'.format(tab_id)
        link = link_template.format(href=href, text=link_text)
        buttons.append(
            template.format(tag=tag_name, css_class=css_class, link=link))
    return literal(''.join(buttons))


def javascript_include_tag(helpers, *names, **attrs):
    """Create JS <script> tag for each name in ``names``.

    ``names`` are paths relative to /javascripts/ without the .js extension.

    """
    request = helpers.request
    url_template = '/static/javascripts/{0}.js'
    link_template = '<script src="{src}"></script>'
    urls = [request.static_path(url_template.format(n)) for n in names]
    links = []
    for url in urls:
        links.append(link_template.format(src=url))
    return literal('\n'.join(links))


def stylesheet_link_tag(helpers, *names, **attrs):
    """Create stylesheet <link> for each name in ``names``.

    ``names`` are paths relative to /stylesheets/ without the .css
    extension.

    """
    request = helpers.request
    url_template = '/static/stylesheets/{0}.css'
    link_template = '<link rel="stylesheet" type="text/css" href="{href}">'
    urls = [request.static_path(url_template.format(n)) for n in names]
    links = []
    for url in urls:
        links.append(link_template.format(href=url))
    return literal('\n'.join(links))
