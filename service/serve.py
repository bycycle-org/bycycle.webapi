import sys
from os.path import abspath, dirname, join
import paste.deploy

server_name = sys.argv[1]

base_path = dirname(abspath(__file__))
ini_name = 'production'
ini_path = join(base_path, '%s.ini' % ini_name)
config_uri = 'config:%s' % ini_path

wsgi_app = paste.deploy.loadapp(config_uri)

serve = paste.deploy.loadserver(config_uri, name=server_name)
serve(wsgi_app)

