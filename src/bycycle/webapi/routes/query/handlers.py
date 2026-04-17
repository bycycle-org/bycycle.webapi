import re

from bycycle.core.exc import InputError

from ..directions.handlers import get as directions_get
from ..lookup.handlers import get as lookup_get

DIRECTIONS_RE = re.compile(r".+\s+to\s+.+")


def get(request):
    try:
        return _get(request)
    except InputError as exc:
        return 400, {
            "service": "query",
            "error": {
                "title": exc.title,
                "explanation": exc.explanation,
                "detail": exc.detail,
            },
        }
    pass


def _get(request):
    params = request.GET
    has_directions_params = "from" in params or "to" in params

    if "term" in params:
        if has_directions_params:
            raise InputError(
                "Query service accepts *either* the `term` query parameter *or* the `from` "
                "and `to` query parameters"
            )

        term = params.get("term", "").strip()

        if DIRECTIONS_RE.match(term):
            return directions_get(request)

        return lookup_get(request)
    elif has_directions_params:
        return directions_get(request)

    raise InputError(
        "Query service requires at least one of the following query parameter: "
        "`term`, `from`, or `to`"
    )
