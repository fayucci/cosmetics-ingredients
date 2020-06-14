from flask import jsonify, request
import numpy as np 
import pandas as pd
from server.data import df
from math import ceil
from functools import reduce

def cosmetics_list():
	raw_filters = [
		label_filter(), 
		brand_filter(), 
		min_price_filter(), 
		max_price_filter(), 
		rank_filter(), 
		combination_filter(), 
		dry_filter(),
		normal_filter(),
		oily_filter(),
		sensitive_filter()
	]
	print(raw_filters)
	all_elements = np.array([True for i in df.iterrows()])
	filters = reduce(lambda a, b: a&b, (_filter for _filter in raw_filters if _filter is not None), all_elements)
	page_size = 50
	page = page_num()
	sort, direction = sort_direction()
	data_drop = df.drop(['ingredients', 'x', 'y'], axis=1)
	data_filter = data_drop.loc[filters]
	data_sort = data_filter.sort_values(by=sort, ascending=direction)
	data_page = data_sort.iloc[page * page_size: (page * page_size) + page_size]
	return jsonify({'data': data_page.to_dict('records'), 'meta':{'pages': ceil(len(data_sort)/page_size), 'page_size': page_size, 'size': len(data_sort)}})


def label_filter():
	label_name = request.args.get('label', '', str)
	if label_name:
		return df['label'] == label_name


def brand_filter():
	brand_name = request.args.get('brand', '', str)
	if brand_name:
		return df['brand'] == brand_name


def min_price_filter():
	min_price = request.args.get('min-price', 0, int)
	if min_price:
		return df['price'] >= 0


def max_price_filter():
	max_price = request.args.get('max-price', 400, int)
	if max_price:
		return df['price'] <= max_price


def rank_filter():
	rank =  request.args.get('rank', 1, int)
	if rank:
		return df['rank'] >= rank


boolean_params = {'': True, 'true': True, 'false': False}

def combination_filter():
	combination = request.args.get('combination', None, str)
	if combination in boolean_params:
		return df['combination'] == boolean_params[combination]


def dry_filter():
	dry = request.args.get('dry', None, str)
	if dry in boolean_params:
		return df['dry'] == boolean_params[dry]


def normal_filter():
	normal = request.args.get('normal', None, str)
	if normal in boolean_params:
		return df['normal'] == boolean_params[normal]

def oily_filter():
	oily = request.args.get('oily', None, str)
	if oily in boolean_params:
		return df['oily'] == boolean_params[oily]


def sensitive_filter():
	sensitive = request.args.get('sensitive', None, str)
	if sensitive in boolean_params:
		return df['sensitive'] == boolean_params[sensitive]


def sort_direction():
	sort = request.args.get('sort', 'name', str)
	ascending =  request.args.get('ascending', None, str)
	if ascending in boolean_params:
		return (sort, boolean_params[ascending])
	else:
		return (sort, True)

def page_num():
	page= request.args.get('page', 0, int)
	return page

