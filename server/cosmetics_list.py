from flask import jsonify, request
import numpy as np 
import pandas as pd
from server.data import df

def cosmetics_list():
	filters = (
		label_filter() & 
		brand_filter() & 
		min_price_filter() & 
		max_price_filter() & 
		rank_filter() & 
		combination_filter() & 
		dry_filter() &
		normal_filter() &
		oily_filter() &
		sensitive_filter())
	df_dict = df.loc[filters].drop('ingredients', axis=1).to_dict('records')
	return jsonify(df_dict)


all = np.array([True for i in df.iterrows()])


def label_filter():
	label_name = request.args.get('label', '', str)
	if label_name:
		return df['label'] == label_name
	else:
		return all

def brand_filter():
	brand_name = request.args.get('brand', '', str)
	if brand_name:
		return df['brand'] == brand_name
	else:
		return all

def min_price_filter():
	min_price = request.args.get('min-price', 0, int)
	if min_price:
		return df['price'] >= 0
	else:
		return all

def max_price_filter():
	max_price = request.args.get('max-price', 400, int)
	if max_price:
		return df['price'] <= max_price
	else:
		return all

def rank_filter():
	rank =  request.args.get('rank', 1, int)
	if rank:
		return df['rank'] >= rank
	else:
		return all

boolean_params = {'': True, 'true': True, 'false': False}

def combination_filter():
	combination = request.args.get('combination', '', str)
	if combination in boolean_params:
		return df['combination'] == boolean_params[combination]
	else:
		return all

def dry_filter():
	dry = request.args.get('dry', '', str)
	if dry in boolean_params:
		return df['dry'] == boolean_params[dry]
	else:
		return all

def normal_filter():
	normal = request.args.get('normal', '', str)
	if normal in boolean_params:
		return df['normal'] == boolean_params[normal]
	else:
		return all

def oily_filter():
	oily = request.args.get('oily', '', str)
	if oily in boolean_params:
		return df['oily'] == boolean_params[oily]
	else:
		return all	

def sensitive_filter():
	sensitive = request.args.get('sensitive', '', str)
	if sensitive in boolean_params:
		return df['sensitive'] == boolean_params[sensitive]
	else:
		return all

