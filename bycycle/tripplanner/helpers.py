from markupsafe import Markup


def include(app):
    app.add_helper(Markup, name='literal', static=True)
    app.add_helper(hide_element_if, static=True)


def hide_element_if(condition=True, as_attr=True):
    if not condition:
        return ''
    rule = 'display: none;'
    if as_attr:
        rule = 'style="{}"'.format(rule)
    return Markup(rule)
