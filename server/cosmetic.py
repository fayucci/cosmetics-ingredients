from flask import request, Response, abort
from server.data import df

def cosmetic():
    id = request.args.get('id', type=int)
    if id not in df.index:
        return abort(404)
    row = df.loc[id]
    row['ingredients'] = row['ingredients'].split(', ')
    radius = 0.5
    under_upper_limit = df['y'] <= row['y'] + radius
    above_lower_limit = df['y'] >= row['y'] - radius
    under_left_limit = df['x'] >= row['x'] - radius
    above_right_limit = df['x'] <= row['x'] + radius
    row['similars'] = df[under_upper_limit & above_lower_limit & under_left_limit & above_right_limit].drop(['ingredients', 'x', 'y'], axis=1).to_dict('records')
    return Response(row.to_json(), mimetype='application/json')