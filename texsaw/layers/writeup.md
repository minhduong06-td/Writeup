# Challenge Layers

## 1. Đầu vào challenge

Đầu vào challenge cung cấp 3 file zip, thử extract file `layer1` trước thấy trong folder `layer1` chứa folder và 1 file `layer1.dmg`.

![](1.png)

---

## 2. Nhận định ban đầu về `layer1.dmg`

Khả năng liên quan tới ổ của macOS. Kiểm tra bằng `file` cho kết quả `zlib compressed data`, bất thường vì một file `.dmg` thông thường sẽ được nhận diện là disk image thay vì chỉ là dữ liệu zlib.

![](2.png)

Từ đây có thể đặt ra hai khả năng:

- file thực chất chỉ là một stream zlib bị đổi đuôi `.dmg`
- hoặc đây là một DMG có dữ liệu được nén theo block

Nghiêng về hướng 2 hơn do đề bài có nói liên quan tới apple store.

![](3.png)

---

## 3. Dấu hiệu xác nhận đây là DMG có metadata block

Để kiểm chứng, tìm chuỗi ASCII trong file và thấy xuất hiện các từ khóa:

```text
plist, resource-fork, blkx
```

![](4.png)

### Kiến thức ngoài lề

**DMG** là Apple Disk Image, là định dạng file ảnh đĩa của macOS.  
DMG không nhất thiết là raw image đơn giản. Nó có thể là:

- ảnh đĩa gần như thô
- hoặc ảnh đĩa đã được nén
- hoặc có thêm metadata mô tả cách ghép dữ liệu

### plist 
viết tắt của **property list**. Đây là một kiểu lưu dữ liệu cấu hình/metadata rất phổ biến trong hệ sinh thái Apple. Nó thường chứa dữ liệu dạng:

- key/value
- dictionary
- array
- string
- integer
- binary data

### resource-fork 
Khái niệm này gắn với lịch sử file trên macOS cổ điển. Ngày xưa, file trên hệ Apple có thể có 2 phần:

- data fork: dữ liệu chính
- resource fork: phần tài nguyên/phụ trợ

là một chỗ để chứa:

- icon
- metadata
- cấu hình
- mô tả bổ sung

### blkx 
có thể hiểu là block map hoặc block run description trong DMG. Nó là nơi mô tả:

- block nào của image nằm ở đâu trong file
- block đó thuộc loại gì
- block đó có nén hay không
- nếu có nén thì offset dữ liệu nén ở đâu
- giải nén xong phải chép vào sector nào của raw image

---

## 4. Convert DMG sang raw image

Sau khi xác định `layer1.dmg` là DMG có dữ liệu được nén theo block thì cần rebuild để lấy được dữ liệu trong file image đó. Sử dụng tool `dmg2img` để convert file DMG sang raw disk image:

```bash
dmg2img layer1.dmg layer1.img
```

Sau đó gắn image vào loop device để kiểm tra các phân vùng bên trong:

```bash
sudo losetup -fP --show layer1.img
ls /dev/loop0*
```

Thấy được phân vùng 1 của `/dev/loop0` là `/dev/loop0p1`.

![](5.png)

---

## 5. Tìm mật khẩu để extract `layer2.zip`

Thử:

```bash
sudo strings -a /dev/loop0p1
```

để xem những chuỗi đọc được, thấy password để extract file `layer2.zip`.

![](6.png)

---

## 6. Phân tích `evidence.vhdx`

Sau khi extract xong thu được `evidence.vhdx`.

![](7.png)

Khả năng đây là ổ đĩa ảo của Windows.
Thử:

```bash
strings -a evidence.vhdx
```
để xem có strings nào đọc được của file này thì thấy ở gần cuối có string Base64.

![](8.png)

Thử decode xem thử thì thu được password để extract file `layer3.zip`, đồng thời cũng biết thêm được file này sẽ liên quan đến Linux disk image.

![](9.png)

### Kiến thức ngoài lề

**VHDX** (*virtual hard disk*) là một file mô phỏng ổ cứng, tương đương với ổ cứng ảo.

---

## 7. Phân tích `ext4.img`

Sau khi extract ra được file `ext4.img`, thử dùng:

```bash
strings -a ext4.img
```

thấy có dấu vết của file `flag.txt`.

![](10.png)

Nhưng dù mount hay dùng lieukit để xem file `flag.txt` cũng không có, chỉ gồm các folder rác là decoy. Vậy có thể là file `flag.txt` đã bị xóa, chỉ còn lại dấu vết trong raw data của image.

Vì vậy thử quét raw image để tìm dấu vết của các định dạng file phổ biến như:

- `pdf`
- `jpeg`
- `png`
- `7z`
- `zip`
- `gzip`

có thể chứa payload còn sót.

![](11.png)

### Kiến thức ngoài lề 

**Offset** là vị trí byte tính từ đầu file. `1f 8b 08` với `gzip` và `50 4b 03 04` với `zip` có thể nhận định rằng các bytes này là magic bytes được coi là đặc trưng của các file thường nằm ở header của file.

---

## 9. Loại trừ các hit JPEG giả

Thấy JPEG có 8 hit, nên thử kiểm tra trước bằng cách xem header tại từng offset.

![](12.png)

Vậy với 8 hit của JPEG chỉ là fake, có thể do signature JPEG quá ngắn, nên chuyển sang 2 hit của gzip.

![](13.png)

---

## 10. Cắt và giải nén dữ liệu GZIP

Cả hai offset `94208` và `4657152` đều bắt đầu bằng chuỗi `1f 8b 08`, đúng với magic bytes đặc trưng của GZIP.

Thử cắt dữ liệu từ vị trí của 2 offset đó rồi giải nén:

```bash
dd if=ext4.img bs=1 skip=94208 status=none | gzip -dc
dd if=ext4.img bs=1 skip=4657152 status=none | gzip -dc
```

thì đều ra flag là:

```text
texsaw{m@try02HkA_d0!12}
```
![](14.png)

## 11. Flow

```text
3 file zip
   |
   v
extract layer1
   |
   v
thấy file layer1.dmg
   |
   v
dùng `file` -> ra `zlib compressed data`
   |
   v
nghi đây là DMG nén theo block
   |
   v
tìm chuỗi ASCII -> thấy `plist`, `resource-fork`, `blkx`
   |
   v
dùng `dmg2img` convert sang `layer1.img`
   |
   v
gắn vào loop device và kiểm tra phân vùng
   |
   v
dùng `strings -a /dev/loop0p1`
   |
   v
lấy password để extract `layer2.zip`
   |
   v
thu được `evidence.vhdx`
   |
   v
dùng `strings -a evidence.vhdx`
   |
   v
thấy chuỗi Base64 gần cuối file
   |
   v
decode Base64
   |
   v
lấy password để extract `layer3.zip`
   |
   v
thu được `ext4.img`
   |
   v
dùng `strings -a ext4.img`
   |
   v
thấy dấu vết của `flag.txt`
   |
   v
mount / dùng liệt kê file nhưng chỉ thấy decoy
   |
   v
suy ra `flag.txt` có thể đã bị xóa, chỉ còn dấu vết trong raw data
   |
   v
quét raw image để tìm magic bytes của các định dạng phổ biến
   |
   v
JPEG có nhiều hit nhưng là false positive
   |
   v
chuyển sang kiểm tra 2 hit của GZIP
   |
   v
xác nhận offset `94208` và `4657152` đều bắt đầu bằng `1f 8b 08`
   |
   v
dùng `dd ... | gzip -dc` để cắt và giải nén
   |
   v
thu được flag

