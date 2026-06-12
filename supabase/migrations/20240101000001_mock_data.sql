-- Delete existing mock users first (optional)
DELETE FROM users WHERE email LIKE '%@shopwave.com';

-- Insert mock users with departments
INSERT INTO users (email, password, full_name, phone, work_role, department) VALUES
  ('rahul.sharma@shopwave.com', 'password123', 'Rahul Sharma', '+91-9876543210', 'Marketing Manager', 'Marketing'),
  ('priya.singh@shopwave.com', 'password123', 'Priya Singh', '+91-9876543211', 'Content Writer', 'Marketing'),
  ('amit.patel@shopwave.com', 'password123', 'Amit Patel', '+91-9876543212', 'Social Media Manager', 'Marketing'),
  
  ('neha.gupta@shopwave.com', 'password123', 'Neha Gupta', '+91-9876543213', 'Order Manager', 'Orders'),
  ('vikram.joshi@shopwave.com', 'password123', 'Vikram Joshi', '+91-9876543214', 'Order Executive', 'Orders'),
  
  ('anjali.reddy@shopwave.com', 'password123', 'Anjali Reddy', '+91-9876543215', 'Full Stack Developer', 'Development'),
  ('karan.mehta@shopwave.com', 'password123', 'Karan Mehta', '+91-9876543216', 'Frontend Developer', 'Development'),
  ('sneha.kumar@shopwave.com', 'password123', 'Sneha Kumar', '+91-9876543217', 'Backend Developer', 'Development'),
  
  ('rohit.verma@shopwave.com', 'password123', 'Rohit Verma', '+91-9876543218', 'Wholesale Manager', 'Wholesale'),
  ('pooja.nair@shopwave.com', 'password123', 'Pooja Nair', '+91-9876543219', 'Wholesale Executive', 'Wholesale'),
  
  ('arjun.shah@shopwave.com', 'password123', 'Arjun Shah', '+91-9876543220', 'SEO Specialist', 'SEO'),
  ('divya.mishra@shopwave.com', 'password123', 'Divya Mishra', '+91-9876543221', 'SEO Analyst', 'SEO'),
  
  ('sanjay.rao@shopwave.com', 'password123', 'Sanjay Rao', '+91-9876543222', 'Sales Manager', 'Sales'),
  ('kavita.jain@shopwave.com', 'password123', 'Kavita Jain', '+91-9876543223', 'Sales Executive', 'Sales'),
  ('manish.pandey@shopwave.com', 'password123', 'Manish Pandey', '+91-9876543224', 'Sales Associate', 'Sales')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  work_role = EXCLUDED.work_role,
  department = EXCLUDED.department;

-- Verify the insert
SELECT id, email, full_name, department, work_role FROM users WHERE email LIKE '%@shopwave.com' ORDER BY department, full_name;
