import pandas as pd
import numpy as np
from sklearn.manifold import TSNE
import re
import asyncio
from threading import Thread

df = pd.read_csv('./server/cosmetics_with_coordenates.csv')

