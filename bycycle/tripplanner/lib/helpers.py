"""
Helper functions

All names available in this module will be available under the Pylons h object.
"""
from webhelpers import *
from pylons.helpers import log
from pylons.i18n import get_lang, set_lang
from restler.helpers import *


def if_ie(content, join_string=''):
    """Create and Internet Explorer conditional comment section."""
    return join_string.join(('<!--[if IE]>', content, '<![endif]-->'))


def hide_element(cond=True, as_attr=True):
    rule = 'display: %s' % ('none' if cond else 'block')
    if as_attr:
        return 'style="%s"' % rule
    else:
        return rule


def make_inline_style(style_dict):
    """Make an inline style attribute (style="a: b;")."""
    if style_dict:
        styles = ['%s: %s' % (i[0], i[1]) for i in style_dict.items()]
    else:
        styles = ''
    return 'style="%s"' % '; '.join(styles)


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
    template = '<%s class="noprint tab-button %%s">%%s</%s>' % (tag_name, tag_name)
    for tab_id in tab_ids:
        link_text = tab_id.replace('-', ' ').capitalize()
        if tab_id == selected:
            css_class = 'selected-tab-button'
        else:
            css_class = ''
        link = link_to(link_text, '#%s' % tab_id, title=link_text)
        buttons.append(template % (css_class, link))
    return ''.join(buttons)
