.PHONY: \
    build \
    clean clean-buildout clean-dist clean-pycache clean-static \
    push-static \
    sdist \
    test

BUILDOUT := buildout
VERSION := $(shell hg id -i)
STATIC_PATH := bycycle/tripplanner/static

all: build

build:
	@$(BUILDOUT)

bin/python:
	@$(BUILDOUT)

build/app.css: $(STATIC_PATH)/css/*.css
	@r.js -o \
	    cssIn=$(STATIC_PATH)/css/base.css \
	    out=build/app.css
	@r.js -o \
	    cssIn=$(STATIC_PATH)/css/base.css \
	    optimizeCss=standard \
	    out=build/app.min.css

build/app.js: bin/python $(STATIC_PATH)/js/main.js $(STATIC_PATH)/js/bycycle/*.js
	@r.js -o \
	    mainConfigFile=$(STATIC_PATH)/js/main.js \
	    baseUrl=$(STATIC_PATH)/js/vendor \
	    name=../main \
	    include=almond \
	    optimize=none \
	    out=build/app.js
	./bin/python -m rjsmin \
	    <build/app.js \
	    >build/app.min.js

static: build/app.css build/app.js

push-static: static
	rsync -rlvz \
	    --delete \
	    $(STATIC_PATH)/ \
	    build/app.min.css \
	    build/app.min.js \
	    bycycle@static.bycycle.org:~/webapps/bycycle_static/$(VERSION)
	rsync -rlvz \
	    $(STATIC_PATH)/{favicon.ico,robots.txt} \
	    deploy@bycycle.org:~/apps/bycycle/static

test: bin/python
	@test -f ./bin/python || $(BUILDOUT)
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

clean-static:
	@rm -vrf build/app*.{css,js}

clean: clean-buildout clean-dist clean-pycache clean-static
