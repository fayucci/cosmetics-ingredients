from flask import request, Response
from server.data import df

def cosmetic():
    id = request.args.get('id', type=int)
    row = df.iloc[id]
    ingredients = row['ingredients'].split(', ')
    row['ingredients'] = {ingredient: len(ingredients) - i for i, ingredient in enumerate(ingredients)}
    row['similars'] = df[(df['x'] >= row['x']-1) & (df['x'] <= row['x']+1) & (df['y'] >= row['y']-1) & (df['y'] <= row['y']+1)].drop(['ingredients', 'x', 'y'], axis=1).to_dict('records')
    return Response(row.to_json(), mimetype='application/json')
