from flask import request, Response
from server.data import df

def cosmetic():
    id = request.args.get('id', type=int)
    row = df.loc[id]
    ingredients = row['ingredients'].split(', ')
    ingredients_count = len(ingredients)
    row['ingredients'] = {ingredient: (ingredients_count - i) / ingredients_count for i, ingredient in enumerate(ingredients)}
    row['similars'] = df[(df['x'] >= row['x']-1) & (df['x'] <= row['x']+1) & (df['y'] >= row['y']-1) & (df['y'] <= row['y']+1)].drop(['ingredients', 'x', 'y'], axis=1).to_dict('records')
    return Response(row.to_json(), mimetype='application/json')
