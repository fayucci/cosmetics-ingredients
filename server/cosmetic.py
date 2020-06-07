from flask import request, Response
from server.data import df

def cosmetic():
    id = request.args.get('id', type=int)
    row = df.iloc[id]
    ingredients = row['ingredients'].split(', ')
    row['ingredients'] = {ingredient: len(ingredients) - i for i, ingredient in enumerate(ingredients)}
    return Response(row.to_json(), mimetype='application/json')
