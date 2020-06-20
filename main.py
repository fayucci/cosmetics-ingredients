from server.cosmetics_list import cosmetics_list
from server.app import App
from server.categories import categories
from server.cosmetic import cosmetic
from server.brands import brands
import server.errors

App.route('/api/cosmetics', methods=['GET'])(cosmetics_list)

App.route('/api/categories', methods=['GET'])(categories)

App.route('/api/cosmetic', methods=['GET'])(cosmetic)

App.route('/api/brands', methods=['GET'])(brands)

App.route('/')(lambda: App.send_static_file('index.html'))

