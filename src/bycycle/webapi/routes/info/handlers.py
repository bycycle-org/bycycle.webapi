from bycycle.core.models import Street
from bycycle.core.models.util import get_extent
from django.conf import settings


def get(_request):
    extent = get_extent(Street)
    info = {
        "debug": settings.DEBUG,
        "env": settings.ENV,
        "bbox": extent.bbox,
        "boundary": extent.boundary,
        "center": extent.center,
    }
    return info
