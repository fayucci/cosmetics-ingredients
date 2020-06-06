from flask import jsonify
from server.data import df

def brands():
    return jsonify(df['brand'].unique().tolist())