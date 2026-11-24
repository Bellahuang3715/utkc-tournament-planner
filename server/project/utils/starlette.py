from starlette.requests import Request
from starlette.routing import Match, Route


def _get_route_for_request(request: Request) -> Route | None:
    """
    Determine FastAPI route for a starlette Request

    Based on: https://stackoverflow.com/a/76203889
    """

    route: Route | None = getattr(request.state, "__route_cached__", None)
    if route is not None:
        return route

    for route in request.app.routes:
        match, _ = route.matches(request.scope)
        if match is Match.FULL:
            # Newer Starlette may match Mount/_IncludedRouter first; only cache real Routes.
            if not isinstance(route, Route) or not isinstance(getattr(route, "path", None), str):
                continue
            request.state.__route_cached__ = route
            return route

    return None


def get_route_path(request: Request) -> str:
    if (route := _get_route_for_request(request)) is not None:
        path = getattr(route, "path", None)
        if isinstance(path, str):
            return path

    return f"unhandled:{request.url.path}"
