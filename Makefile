all: build

build:
	@buildout

build-js:
	@node --stack-size=4092 \
	    /usr/local/bin/r.js -o \
	    mainConfigFile=bycycle/tripplanner/static/javascripts/main.js \
	    baseUrl=bycycle/tripplanner/static/javascripts/vendor \
	    include=almond \
	    name=../main \
	    out=bycycle/tripplanner/static/javascripts/app.js

build-css:
	@r.js -o \
	    cssIn=bycycle/tripplanner/static/stylesheets/base.css \
	    optimizeCss=standard \
	    out=bycycle/tripplanner/static/stylesheets/app.css

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
