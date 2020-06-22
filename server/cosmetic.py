from flask import request, Response, abort
from server.data import df

def cosmetic():
    if 'x' not in df.columns:
        return abort(503)
    id = request.args.get('id', type=int)
    if id not in df.index:
        return abort(404)
    row = df.loc[id]
    row['ingredients'] = row['ingredients'].split(', ')
    radius = 1
    x = row['x']
    y = row['y']
    under_upper_limit = (df['y'] <= y + radius)
    above_lower_limit = df['y'] >= y - radius
    under_left_limit = df['x'] >= x - radius
    above_right_limit = df['x'] <= x + radius
    not_self = df['id'] != id
    row['similars'] = df[under_upper_limit & above_lower_limit & under_left_limit & above_right_limit & not_self].drop(['ingredients', 'x', 'y'], axis=1).to_dict('records')
    return Response(row.to_json(), mimetype='application/json')