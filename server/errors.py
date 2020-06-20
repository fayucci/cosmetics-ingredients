from flask import Flask, render_template
from server.app import App

@App.errorhandler(404)
def page_not_found(error):
    return render_template('page_not_found.html'), 404

@App.errorhandler(500)
def internal_error(error):
    return render_template('internal_error.html'), 500

