import pandas as pd
import numpy as np
from sklearn.manifold import TSNE

df = pd.read_csv('datasets/cosmetics.csv', 
    dtype={
    'combination': 'bool',
    'dry': 'bool',
    'normal':'bool',
    'oily': 'bool',
    'sensitive': 'bool'
    },
    names=[
        'label',
        'brand', 
        'name', 
        'price', 
        'rank', 
        'ingredients', 
        'combination', 
        'dry', 
        'normal', 
        'oily', 
        'sensitive'], 
    header=0)

df['id'] = df.index

df = (df.loc[df['ingredients'] != 'No Info'])

pattern = "^Visit.*"
filter = df['ingredients'].str.contains(pattern)
df = df[~filter]

df['ingredients'] = df['ingredients'].str.replace(r'\*+', '', regex=True)

df['brand'] = df['brand'].str.replace("KIEHL'S SINCE 1851", "KIEHL'S")

labels = df['label'].unique().tolist()

brands = df['brand'].unique().tolist()

max_price = df['price'].max()

min_price = df['price'].min()

df = (df.loc[df['name'] != '#NAME?'])

df = (df.loc[df['ingredients'] != '#NAME?'])

corpus = [ingredients.lower().split(', ') for ingredients in df['ingredients']]

all_ingre = (ingredient for ingredients in corpus for ingredient in ingredients)

unique_ingr = list(dict.fromkeys(all_ingre))

ingre_tupla = [(i, ingre) for ingre, i in enumerate(unique_ingr)]
    
ingredient_idx = dict(ingre_tupla)

M = len(df)
N = len(ingredient_idx)

# matrix
A = np.zeros((M, N))

def oh_encoder(tokens):
    x = np.zeros(N)
    for ingredient in tokens:
        idx = ingredient_idx[ingredient]
        x[idx] = 1
    return x

i = 0
for tokens in corpus:
    A[i, :] = oh_encoder(tokens)
    i += 1

model = TSNE(n_components=2, learning_rate=200, random_state=42)
tsne_features = model.fit_transform(A)
 
df['x'] = tsne_features[:, 0]
df['y'] = tsne_features[:, 1]
