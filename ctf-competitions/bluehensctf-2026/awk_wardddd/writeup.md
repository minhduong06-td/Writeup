# Challenge awk...wardddd

## 1. Đầu vào challenge

![](1.png)

Từ đề bài có thể thấy **“Most contents are redundant or stale. Focus on what remains consistent”**, phần lớn dữ liệu là rác, cần phải tìm ra những record có pattern nhất quán.

Mở thử 1 vài file thấy phần lớn các file đều có cấu trúc như này.

![](2.png)

## 2. Tìm các trường có pattern ổn định

Thử `grep` và `sort` xem các trường xuất hiện trong format. Chú ý `note` và `comment` thì cũng khó để nhìn ra text thường, `timestamp` khó vì các file đôi khi có thể lệch nhau và có cả phần mili giây, `part` thì có thể nghĩ là các phần của flag nhưng có nhiều file rác sinh ra nên đôi khi file rác và file thật có thể trùng `part` nhau, `uid` là mã id của từng file nên tất cả sẽ khác nhau.

Vậy chỉ còn trường `profile` và `state` đáng để thử `grep` và `sort`.

```bash
grep -R "profile=" -h . | sort | uniq -c
grep -R "state=" -h . | sort | uniq -c
```

![](3.png)

Thấy được `state=active` và `profile=delta` đều xuất hiện `7` lần, vậy giờ lấy tên file và nội dung của các file chứa cả 2 giá trị `state` và `profile` đó.

```bash
grep -R -l 'state=active' . | xargs grep -l 'profile=delta' | while read f; do
  cat "$f"
  echo
done
```

![](4.png)

## 3. Ghép dữ liệu theo trường `part`

Sắp xếp trường `data` dựa vào trường `part` thu được 1 đoạn base64, decode thì thu được flag là `UDCTF{w3ll_7h47_w45n'7_70_h4rd_w45_17?}`.

![](5.png)

## 4. Flag

```text
UDCTF{w3ll_7h47_w45n'7_70_h4rd_w45_17?}
```

## 5. Flow

```mermaid
flowchart TD
    A["Đọc đề bài và nhận ra phần lớn dữ liệu là rác"] --> B["Mở thử một vài file để quan sát format chung"]
    B --> D["Loại dần các trường không ổn định:<br/>note, comment, timestamp, uid, tập trung vào 2 trường có pattern nhất quán:<br/>profile và state"]
    D --> F["grep + sort để đếm số lần xuất hiện, nhận ra state=active và profile=delta đều xuất hiện 7 lần"]
    F --> H["Lọc các file thỏa cả 2 điều kiện"]
    H --> I["Lấy trường data và sắp xếp theo part"]
    I --> K["Decode base64, thu được flag"]
```
