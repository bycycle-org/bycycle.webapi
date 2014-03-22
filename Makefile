all: build

VERSION := $(shell hg id -i)
STATIC_PATH := bycycle/tripplanner/static

build:
	@buildout

build-js:
	@r.js -o \
	    mainConfigFile=$(STATIC_PATH)/js/main.js \
	    baseUrl=$(STATIC_PATH)/js/vendor \
	    name=../main \
	    include=almond \
	    optimize=none \
	    out=build/app.js
	./bin/python -m rjsmin \
	    <build/app.js \
	    >$(STATIC_PATH)/js/app.js

build-css:
	@r.js -o \
	    cssIn=$(STATIC_PATH)/css/base.css \
	    optimizeCss=standard \
	    out=$(STATIC_PATH)/css/app.css

push-static:
	rsync -rlvz \
	    --delete \
	    $(STATIC_PATH)/ \
	    bycycle@static.bycycle.org:~/webapps/bycycle_static/$(VERSION)
	rsync -rlvz \
	    $(STATIC_PATH)/{favicon.ico,robots.txt} \
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
