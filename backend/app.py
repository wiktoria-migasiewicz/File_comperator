import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
from flask_mysqldb import MySQL
import MySQLdb.cursors
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import logging
from difflib import unified_diff
import re
from apscheduler.schedulers.background import BackgroundScheduler

# Load environment variables from .env file
load_dotenv()

# Configure logging to write warnings and above to 'app.log'
logging.basicConfig(filename='app.log', level=logging.WARNING)

# Initialize Flask application
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Retrieve secret key from environment
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set in the environment")
app.config['SECRET_KEY'] = SECRET_KEY

# Configure MySQL connection from environment variables
app.config.update({
    'MYSQL_HOST': os.getenv('DB_HOST', 'localhost'),
    'MYSQL_USER': os.getenv('DB_USER', 'root'),
    'MYSQL_PASSWORD': os.getenv('DB_PASSWORD', ''),
    'MYSQL_DB': os.getenv('DB_NAME', ''),
    'MYSQL_PORT': int(os.getenv('DB_PORT', 3306)),
    # Optional SSL certificates for MySQL
    'MYSQL_SSL_CA': os.getenv('MYSQL_SSL_CA') or None,
    'MYSQL_SSL_CERT': os.getenv('MYSQL_SSL_CERT') or None,
    'MYSQL_SSL_KEY': os.getenv('MYSQL_SSL_KEY') or None,
})

# Initialize MySQL extension
mysql = MySQL(app)

# Configure upload folder
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Helper function to get raw DB connection
def get_db():
    return mysql.connection

# Close DB connection at the end of request
@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop('mysql_db', None)
    if db is not None:
        try:
            db.close()
        except MySQLdb.OperationalError:
            pass

# User registration endpoint
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # Check required fields
    if not username or not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    cursor = db.cursor()
    try:
        # Hash password and insert new user record
        password_hash = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)',
            (username, email, password_hash)
        )
        db.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except MySQLdb.IntegrityError:
        # Handle duplicate username or email
        return jsonify({'error': 'Username or email already exists'}), 400

# User login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username_input = data.get('username')
    password_input = data.get('password')

    # Check required fields
    if not username_input or not password_input:
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    cursor = db.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute('SELECT * FROM users WHERE username = %s', (username_input,))
    user = cursor.fetchone()

    # Verify password and generate JWT token
    if user and check_password_hash(user['password_hash'], password_input):
        token = jwt.encode(
            {
                'user_id': user['id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            },
            SECRET_KEY,
            algorithm='HS256'
        )
        return jsonify({'token': token}), 200

    return jsonify({'error': 'Invalid username or password'}), 401

# Decorator for JWT token authentication
def token_required(f):
    def wrapper(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            g.user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)

    wrapper.__name__ = f.__name__
    return wrapper

# Allowed file extensions for upload (define as needed)
ALLOWED_EXTENSIONS = {'.txt', '.py', '.md'}  # Example set

def allowed_file(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS

# Regex to strip numeric prefixes added by uploader
_RE_PREFIX = re.compile(r'^[0-9]+_[0-9]+\.(?:[0-9]+)?_')

def clean_name(filename: str) -> str:
    name = os.path.basename(filename)
    return _RE_PREFIX.sub('', name)

# Endpoint to compare two uploaded files\ n@app.route('/api/compare', methods=['POST'])
@token_required
def compare_files():
    file1 = request.files.get('file1')
    file2 = request.files.get('file2')

    # Ensure both files are provided
    if not file1 or not file2:
        return jsonify({'error': 'Two files required (file1, file2)'}), 400

    # Validate file extensions
    if not (allowed_file(file1.filename) and allowed_file(file2.filename)):
        allowed = ', '.join(sorted(ALLOWED_EXTENSIONS))
        return jsonify({'error': f'Unsupported file type. Allowed: {allowed}'}), 415

    # Clean up filenames for display
    orig_name1 = clean_name(file1.filename)
    orig_name2 = clean_name(file2.filename)

    try:
        # Read file contents as UTF-8 text
        before_text = file1.read().decode('utf-8', errors='ignore').splitlines(keepends=True)
        after_text = file2.read().decode('utf-8', errors='ignore').splitlines(keepends=True)
    except Exception as e:
        return jsonify({'error': f'Could not read files: {e}'}), 400

    # Generate unified diff
    diff_lines = unified_diff(
        before_text,
        after_text,
        fromfile=orig_name1,
        tofile=orig_name2,
        lineterm=''
    )
    diff_text = '\n'.join(diff_lines)

    return jsonify({'filename1': orig_name1, 'filename2': orig_name2, 'diff': diff_text}), 200

# Endpoint to save diff result to database
@app.route('/api/save-comparison', methods=['POST'])
@token_required
def save_comparison():
    data = request.json
    filename1 = data.get('filename1')
    filename2 = data.get('filename2')
    diff = data.get('diff')

    if not filename1 or not filename2 or diff is None:
        return jsonify({'error': 'Missing data'}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO file_comparisons (user_id, filename1, filename2, diff, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        """,
        (g.user_id, filename1, filename2, diff)
    )
    db.commit()

    return jsonify({'message': 'Comparison saved'}), 201

# Endpoint to delete a saved comparison by ID\ n@app.route('/api/comparison/<int:comp_id>', methods=['DELETE'])
@token_required
def delete_comparison(comp_id):
    db = get_db()
    cursor = db.cursor()

    # Verify the comparison belongs to the user
    cursor.execute(
        "SELECT id FROM file_comparisons WHERE id = %s AND user_id = %s",
        (comp_id, g.user_id)
    )
    row = cursor.fetchone()
    if not row:
        # Do not reveal existence of other users' comparisons
        return jsonify({'error': 'Comparison not found'}), 404

    cursor.execute("DELETE FROM file_comparisons WHERE id = %s", (comp_id,))
    db.commit()

    return jsonify({'message': 'Comparison deleted'}), 200

# Endpoint to list all comparisons for the authenticated user
@app.route('/api/my-comparisons', methods=['GET'])
@token_required
def my_comparisons():
    db = get_db()
    cursor = db.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(
        """
        SELECT id, filename1, filename2, diff, created_at
        FROM file_comparisons
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (g.user_id,)
    )
    comparisons = cursor.fetchall()
    return jsonify(comparisons), 200

# Health-check endpoint for database connectivity
@app.route('/api/test-db')
def test_db():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT 1")
        return jsonify({'message': 'DB Connection Successful'}), 200
    except Exception:
        return jsonify({'error': 'DB Connection Failed'}), 500

# Serve uploaded files statically
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Function to perform database backup via mysqldump
def backup_database():
    backup_dir = os.getenv('DB_BACKUP_DIR', 'C:/Users/wikto/db_backup/')
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    backup_file = os.path.join(backup_dir, f"backup_{timestamp}.sql")
    command = (
        f"\"C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump\""
        f" -u {app.config['MYSQL_USER']} -p{app.config['MYSQL_PASSWORD']}"
        f" -h {app.config['MYSQL_HOST']} -P {app.config['MYSQL_PORT']} {app.config['MYSQL_DB']} > {backup_file}"
    )
    os.system(command)

# Schedule daily database backups using APScheduler
def start_backup_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(backup_database, 'interval', hours=24)
    scheduler.start()

if __name__ == "__main__":
    # Optionally start backup scheduler
    # start_backup_scheduler()

    ssl_cert = os.getenv('FLASK_SSL_CERT', 'certs/localhost.pem')
    ssl_key = os.getenv('FLASK_SSL_KEY', 'certs/localhost-key.pem')
    app.run(ssl_context=(ssl_cert, ssl_key), debug=True)
    # Perform one-time backup after server shutdown
    backup_database()
