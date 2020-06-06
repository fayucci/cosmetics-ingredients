from flask import Flask, jsonify
from server.cosmetics_list import cosmetics_list
from server.app import App


App.route('/api/cosmetics_list', methods=['GET'])(cosmetics_list)
