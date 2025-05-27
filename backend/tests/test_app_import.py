import pytest
from file_compering_new.backend.app import app as flask_app
from flask import Flask

def test_flask_app_imports_and_is_flask_instance():
    assert isinstance(flask_app, Flask), "Obiekt 'app' nie jest instancją Flask"
