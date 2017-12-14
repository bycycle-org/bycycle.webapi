def include(app):
    app.mount_resource('home', '.service:ServiceResource', '/')
    app.mount_resource('search', '.service:ServiceResource', '/search')
    app.mount_resource('lookup', '.lookup:Lookup', '/lookup')
    app.mount_resource('route', '.route:Route', '/route')
