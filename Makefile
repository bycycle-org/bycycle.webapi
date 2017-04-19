venv ?= .env

init: $(venv)
	$(venv)/bin/pip install -r requirements.txt

$(venv):
	virtualenv -p python3 $(venv)

sdist: clean clean-dist
	$(venv)/bin/python setup.py sdist

test:
	$(venv)/bin/tangled test

clean: clean-dist clean-pycache

clean-all: clean clean-venv

clean-dist:
	rm -frv dist

clean-pycache:
	find . -type d -name __pycache__ | xargs rm -rf

clean-venv:
	rm -frv $(venv)

VERSION := $(shell hg id -i)
STATIC_PATH := bycycle/tripplanner/static

build/app.css: $(STATIC_PATH)/css/*.css
	@r.js -o \
	    cssIn=$(STATIC_PATH)/css/base.css \
	    out=build/app.css
	@r.js -o \
	    cssIn=$(STATIC_PATH)/css/base.css \
	    optimizeCss=standard \
	    out=build/app.min.css

build/app.js: $(STATIC_PATH)/js/main.js $(STATIC_PATH)/js/bycycle/*.js
	@r.js -o \
	    mainConfigFile=$(STATIC_PATH)/js/main.js \
	    baseUrl=$(STATIC_PATH)/js/vendor \
	    name=../main \
	    include=almond \
	    optimize=none \
	    out=build/app.js
	$(venv)/bin/python -m rjsmin \
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

.PHONY = init install sdist test static push-static clean clean-all clean-dist clean-pycache clean-venv
