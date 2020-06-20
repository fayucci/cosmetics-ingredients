from flask import jsonify
from server.data import df

def brands():
    return jsonify(sorted(df['brand'].unique().tolist()))