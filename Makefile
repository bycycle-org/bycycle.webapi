all: build

VERSION = $(shell hg id -i)

build:
	@buildout

build-js:
	@node --stack-size=4092 \
	    /usr/local/bin/r.js -o \
	    mainConfigFile=bycycle/tripplanner/static/js/main.js \
	    baseUrl=bycycle/tripplanner/static/js/vendor \
	    include=almond \
	    name=../main \
	    out=bycycle/tripplanner/static/js/app.js

build-css:
	@r.js -o \
	    cssIn=bycycle/tripplanner/static/css/base.css \
	    optimizeCss=standard \
	    out=bycycle/tripplanner/static/css/app.css

push-static:
	rsync -rlvz \
	    --delete \
	    ./bycycle/tripplanner/static/ \
	    bycycle@static.bycycle.org:~/webapps/bycycle_static/$(VERSION)
	rsync -rlvz \
	    ./bycycle/tripplanner/static/{favicon.ico,robots.txt} \
	    deploy@bycycle.org:~/apps/bycycle/static

test:
	@test -f ./bin/python || make
	@./bin/tangled test

sdist: clean build
	@./bin/python setup.py sdist

clean-buildout:
	@rm -vrf .installed.cfg bin develop-eggs parts

clean-dist:
	@rm -vrf build dist *.egg-info

clean-pycache:
	@echo "Removing __pycache__ directories"
	@find . -type d -name __pycache__ | xargs rm -rf

clean: clean-buildout clean-dist clean-pycache
