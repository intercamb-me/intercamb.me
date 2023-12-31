<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta name="viewport" content="width=device-width"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <link href="styles/main.css" media="all" rel="stylesheet" type="text/css"/>
  </head>
  <body itemscope itemtype="http://schema.org/EmailMessage">
    <table class="body-wrap">
      <tr>
        <td></td>
        <td class="container" width="600">
          <div class="content">
            <table class="main" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="alert alert-good">
                  <h1>{% block title %}{% endblock %}</h1>
                </td>
              </tr>
              <tr>
                <td class="content-wrap">
                  {% block content %}
                  {% endblock %}
                </td>
              </tr>
            </table>
            <div class="footer">
              <table width="100%">
                <tr>
                  <td class="content-block align-center">
                    Copyright © 2018 Intercamb.me, Todos os direitos reservados.<br/>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </td>
        <td></td>
      </tr>
    </table>
  </body>
</html>