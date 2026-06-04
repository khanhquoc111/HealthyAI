from database.database import engine

try:
    with engine.connect() as connection:
        print("Kết nối đến MySQL thành công!")
        print(f"Engine: {engine}")
except Exception as e:
    print(f"Connection failed: {e}")