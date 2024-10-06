import pandas as pd
import matplotlib.pyplot as plt

# Read the CSV file
df = pd.read_csv('OSD-379-samples.csv')

# 1. Bar plot of sample counts by age group
plt.figure(figsize=(10, 6))
age_counts = df['Factor Value: Age'].value_counts()
plt.bar(age_counts.index, age_counts.values)
plt.title('Sample Counts by Age Group')
plt.xlabel('Age Group')
plt.ylabel('Count')
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# 2. Pie chart of sample types (Basal Control vs others)
plt.figure(figsize=(8, 8))
sample_types = df['Factor Value: Spaceflight'].value_counts()
plt.pie(sample_types.values, labels=sample_types.index, autopct='%1.1f%%')
plt.title('Distribution of Sample Types')
plt.axis('equal')
plt.tight_layout()
plt.show()

# 3. Grouped bar plot of dissection conditions by age group
plt.figure(figsize=(12, 6))
dissection_age = df.groupby(['Factor Value: Age', 'Factor Value: Dissection Condition']).size().unstack()

bar_width = 0.35
index = range(len(dissection_age.index))

for i, condition in enumerate(dissection_age.columns):
    plt.bar([x + i * bar_width for x in index], dissection_age[condition], 
            bar_width, label=condition)

plt.title('Dissection Conditions by Age Group')
plt.xlabel('Age Group')
plt.ylabel('Count')
plt.xticks([x + bar_width/2 for x in index], dissection_age.index, rotation=45)
plt.legend(title='Dissection Condition', bbox_to_anchor=(1.05, 1), loc='upper left')
plt.tight_layout()
plt.show()

print("All visualizations have been displayed.")
