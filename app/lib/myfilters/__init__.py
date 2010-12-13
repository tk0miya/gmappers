import re

from jinja2 import evalcontextfilter, Markup, escape

_paragraph_re = re.compile(r'(?:\r\n|\r|\n){2,}')

@evalcontextfilter
def nl2br(eval_ctx, value):
    result = value.replace('\n', '<br />')
    if eval_ctx.autoescape:
        result = Markup(result)
    return result


def install(app):
    app.template_filter('nl2br')(nl2br)
