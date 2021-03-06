<style>
    html, body {
        color: #333;
        font-family: Helvetica, sans-serif;
        font-size: 16px;
        line-height: 1.2;
        margin: 0 auto;
        padding: 15px;
        max-width: 1024px;
    }

    input {
        width: 400px;
    }

    label {
        color: #444;
        display: block;
        font-size: 95%;
        margin-bottom: 5px;
    }

    .help {
        color: #707070;
        font-size: 85%;
    }
</style>

<h1>byCycle</h1>

<h2>Get There by Cycle!</h2>

<p>
    This is a test page for use in development.
</p>

<p>
    To access the main UI, go into the <code>bycycle.webui</code> repo, run <code>npm start</code>,
    then <a href="${request.registry.settings['frontend.url']}">click here</a>.
</p>

<h3>Search</h3>

<form action="${request.route_url('query')}">
    <p>
        <p class="help">Ex: -122.662709,45.522952</p>
        <input type="search" name="term">
    </p>
    <p>
        <button type="submit">Search</button>
    </p>
</form>

<h3>Directions</h3>

<form action="${request.route_url('directions')}">
    <p>
        <label for="from">From</label>
        <p class="help">Ex: -122.662709, 45.522952</p>
        <input type="search" id="from" name="from">
    </p>
    <p>
        <label for="to">To</label>
        <p class="help">Ex: -122.673352, 45.523050<p>
        <input type="search" id="to" name="to">
    </p>
    <p>
        <button type="submit">Get Directions</button>
    </p>
</form>
