<h1>${error['title']}</h1>

<h2>${error['explanation']}</h2>

% if error['detail']:
    <p>${error['detail']}</p>
% endif

<p>
    <a href="${request.route_url('home')}">Home</a>
</p>
