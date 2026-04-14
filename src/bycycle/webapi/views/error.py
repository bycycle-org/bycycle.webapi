def notfound_view(request):
    request.response.status = 404
    return {
        'error': {
            'title': 'Not Found',
            'explanation': 'Not found',
            'detail': None,
        },
    }
