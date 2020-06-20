from flask import Flask

App = Flask(__name__, static_url_path='', static_folder='../static', template_folder='../templates')
