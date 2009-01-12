from paste import httpexceptions


class RedirectMiddleware():
    """Redirect paths to new locations.

    Example config file setup::

        redirect.rules =
            /seattle/index_alist.asp /alist temp
            /press /mediarelations

    """

    def __init__(self, app, config):
        self.app = app
        self.redirect_rules = {}
        for line in config['redirect.rules'].splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            try:
                old_path, new_location, redirect_type = parts
            except ValueError:
                try:
                    old_path, new_location = parts
                except ValueError:
                    raise ValueError(
                        'Redirects require "old_path new_location"')
                else:
                    redirect_type = 'temporary'
            self.redirect_rules[old_path] = dict(
                new_location=new_location,
                redirect_type=redirect_type)

    def __call__(self, environ, start_response):
        path_info = environ['PATH_INFO'].strip().rstrip('/').lower()
        if path_info in self.redirect_rules:
            redirect_rules = self.redirect_rules[path_info]
            new_location = redirect_rules['new_location']
            redirect_type = redirect_rules['redirect_type']
            redirect_exc = self.status_code_to_exception(redirect_type)
            return redirect_exc(new_location).wsgi_application(
                environ, start_response)
        else:
            return self.app(environ, start_response)

    def status_code_to_exception(self, redirect_type):
        """Get HTTP exception associated with ``redirect_type``.

        ``redirect_type`` may either be an HTTP status code or a word
        associated with such a code (e.g., "temp" for 302).

        Lifted from WSGIRewrite: http://code.google.com/p/wsgirewrite/.
        Specifically, from trunk at r13. Modified slightly.

        """
        code_exc_map = {
            'permanent': httpexceptions.HTTPMovedPermanently,
            'perm': httpexceptions.HTTPMovedPermanently,
            '301': httpexceptions.HTTPMovedPermanently,
            'temporary': httpexceptions.HTTPFound,
            'temp': httpexceptions.HTTPFound,
            '302': httpexceptions.HTTPFound,
        }
        return code_exc_map[redirect_type]
