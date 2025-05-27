from backend.app import (app as flask_app)
from flask import Flask
import os

def test_flask_app_imports_and_is_flask_instance():
    print('ess')
    print(os.getcwd())
    print('ess')
    assert isinstance(flask_app, Flask), "Obiekt 'app' nie jest instancją Flask"
