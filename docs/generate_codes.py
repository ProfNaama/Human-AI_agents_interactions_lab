
import random
random.seed(64783462263)

code_len = 10
codes_count = 320

expid = "expid_111"

def generate_codes(codes_count=320):
    d = list(map(str, range(10))) + [chr(ord("a")+i) for i in range(26)]
    return ["".join([d[random.randint(0, len(d)-1)]  for i in range(code_len)]) for i in range(codes_count)]
    

def generate_csv_format(codes):
    liens = ["{}".format(c) for c in codes]
    print("\n".join(liens))

# prapare for PostgreSQL
def generate_postgresql_format(codes):
    print ("INSERT INTO human_ai_interactions_lab_codes (code, expid) VALUES")
    print(",\n".join([f'(\'{c}\',\'{expid}\')' for c in codes]))
    print (";")
    
codes = generate_codes(codes_count * 2)
codes = codes[codes_count:]
print("================")
generate_csv_format(codes)
print("================")
generate_postgresql_format(codes)
print("================")